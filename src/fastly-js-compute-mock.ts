/// <reference types="@fastly/js-compute" />

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:backend.d.ts
interface BackendConfiguration {
  name: string;
  target: string;
  hostOverride?: string;
  connectTimeout?: number;
  firstByteTimeout?: number;
  betweenBytesTimeout?: number;
  useSSL?: boolean;
  tlsMinVersion?: 1 | 1.1 | 1.2 | 1.3;
  tlsMaxVersion?: 1 | 1.1 | 1.2 | 1.3;
  certificateHostname?: string;
  caCertificate?: string;
  ciphers?: string;
  sniHostname?: string;
  clientCertificate?: {
    certificate: string;
    key: SecretStoreEntry;
  };
}

// Pool of backend instances, use for some Backend static function result
const backendPool = new Map<string, Backend>();

export class Backend {
  private config: BackendConfiguration;

  constructor(configuration: BackendConfiguration) {
    this.config = configuration;
    backendPool.set(configuration.name, this);
  }

  public toString(): string {
    return this.config.name;
  }

  public toName(): string {
    return this.config.name;
  }

  static exists(name: string): boolean {
    return backendPool.has(name);
  }

  static fromName(name: string): Backend {
    let backend = backendPool.get(name);
    if (!backend) {
      backend = new  Backend({
        name,
        target: name,
      });
      backendPool.set(name, backend);
    }
    return backend;
  }

  static health(backend: Backend): "healthy" | "unhealthy" | "unknown" {
    // Always returns "unknown"
    return "unknown";
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:cache-override.d.ts
export class CacheOverride {
  public mode: "none" | "pass" | "override";
  public ttl?: number;
  public swr?: number;
  public surrogateKey?: string;
  public pci?: boolean;

  constructor(
    mode: "none" | "pass" | "override",
    init?: {
      ttl?: number;
      swr?: number;
      surrogateKey?: string;
      pci?: boolean;
    },
  ) {
    this.mode = mode;
    if (init) {
      this.ttl = init.ttl;
      this.swr = init.swr;
      this.surrogateKey = init.surrogateKey;
      this.pci = init.pci;
    }
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/body.d.ts
export class FastlyBody {
  protected body: Uint8Array;

  constructor() {
    this.body = new Uint8Array();
  }

  public concat(dest: FastlyBody) {
    const merged = new Uint8Array(this.body.length + dest.body.length);
    merged.set(this.body);
    merged.set(dest.body);
    this.body = merged;
  }

  public read(chunkSize: number): ArrayBuffer {
    const end = chunkSize > this.body.length ? chunkSize : this.body.length;
    const ret = new Uint8Array(end);
    for (let i = 0; i < end; i++) {
      ret[i] = this.body[i];
    }
    return ret;
  }

  public append(data: BodyInit) {
    const v = new TextEncoder().encode(toString(data));
    const appended = new Uint8Array(this.body.length + v.length);
    appended.set(this.body);
    appended.set(v);
    this.body = appended;
  }

  public prepend(data: BodyInit) {
    const v = new TextEncoder().encode(toString(data));
    const prepended = new Uint8Array(v.length + this.body.length);
    prepended.set(v);
    prepended.set(this.body);
    this.body = prepended;
  }

  public close() {
    // @FIXME what should we do?
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly%3Acache.d.ts
interface PurgeOptions {
  scope: "pop" | "global";
}

export class SimpleCache {
  public static _cacheEntry = new Map<
    string,
    { data: SimpleCacheEntry; ttl: number }
  >();

  static get(key: string): SimpleCacheEntry | null {
    const entry = SimpleCache._cacheEntry.get(key);
    if (!entry) {
      return null;
    }
    // Check TTL expiration
    if (Date.now() > entry.ttl) {
      SimpleCache._cacheEntry.delete(key);
      return null;
    }
    return entry.data;
  }

  // TODO: what does length argument mean?
  static set(
    key: string,
    value: BodyInit,
    ttl: number,
    length?: number,
  ): undefined {
    SimpleCache._cacheEntry.set(key, {
      data: new SimpleCacheEntry(new Blob([toString(value)]).stream()),
      ttl: Date.now() + ttl,
    });
    return;
  }

  static async getOrSet(
    key: string,
    set: () => Promise<{
      value: BodyInit | ReadableStream;
      ttl: number;
      length?: number;
    }>,
  ): Promise<SimpleCacheEntry> {
    const entry = SimpleCache.get(key);
    if (entry) {
      return entry;
    }
    const item = await set();
    const data = new SimpleCacheEntry(new Blob([toString(item.value)]).stream());
    SimpleCache._cacheEntry.set(key, {
      data,
      ttl: Date.now() + item.ttl,
    });
    return Promise.resolve(data);
  }

  static purge(key: string, options: PurgeOptions): undefined {
    // No matters whatever purge options are
    SimpleCache._cacheEntry.delete(key);
    return;
  }
}

// Same implementation of KVStoreEntry
export class SimpleCacheEntry implements SimpleCacheEntry {
  private data: ReadableStream;
  constructor(data: ReadableStream) {
    this.data = data;
  }
  get body(): ReadableStream {
    if (this.data instanceof ReadableStream) {
      return this.data;
    }
    return new ReadableStream();
  }
  get bodyUsed(): boolean {
    return false;
  }
  text(): Promise<string> {
    return Promise.resolve(toString(this.data));
  }
  json(): Promise<object> {
    return Promise.resolve(JSON.parse(toString(this.data)));
  }
  arrayBuffer(): Promise<ArrayBuffer> {
    const buf = new Uint8Array();
    const str = toString(this.data);
    for (let i = 0; i < str.length; i++) {
      buf[i] = str[i].charCodeAt(0);
    }
    return Promise.resolve(buf);
  }
}

export interface LookupOptions {
  headers?: HeadersInit;
}

export interface InsertOptions extends TransactionInsertOptions {
  headers?: HeadersInit;
}

export interface TransactionInsertOptions {
  maxAge: number;
  vary?: Array<string>;
  initialAge?: number;
  staleWhileRevalidate?: number;
  surrogateKey?: Array<string>;
  length?: number;
  userMetadata?: ArrayBufferView | ArrayBuffer | URLSearchParams | string;
  sensitive?: boolean;
}

export class CoreCache {
  static lookup(key: string, options?: LookupOptions): CacheEntry | null {
    return null;
  }
  static insert(key: string, options?: InsertOptions): FastlyBody {
    return new FastlyBody();
  }
  static transactionLookup(key: string, options?: LookupOptions): TransactionCacheEntry {
    return new TransactionCacheEntry();
  }
};

export class CacheState {
  protected _found: boolean = false;
  protected _usable: boolean = false;
  protected _stale: boolean = false;
  protected _mustInsertOrUpdate = false;

  public found(): boolean {
    return this._found;
  }

  public usable(): boolean {
    return this._usable;
  }

  public stale(): boolean {
    return this._stale;
  }

  public mustInsertOrUpdate(): boolean {
    return this._mustInsertOrUpdate;
  }
}

export interface CacheBodyOptions {
  start: number;
  end: number;
}

export class CacheEntry {
  private _state: CacheState = new CacheState();
  private _metadata: ArrayBuffer = new Uint8Array();
  private _body: Uint8Array = new Uint8Array();
  private _maxAge: number = 0;
  private _staleWhileRevalidate: number = 0;
  private _age: number = 0;
  private _hits: number = 0;

  close(): void {}
  public state(): CacheState {
    return this._state;
  }
  public userMetadata(): ArrayBuffer {
    return this._metadata;
  }
  public body(options?: CacheBodyOptions): ReadableStream {
    return new Blob([this._body]).stream();
  }
  public length(): number {
    return this._body.length;
  }
  public maxAge(): number {
    return this._maxAge;
  }
  public staleWhileRevalidate(): number {
    return this._staleWhileRevalidate;
  }
  public age(): number {
    return this._age;
  }
  public hits(): number {
    return this._hits;
  }
}

export interface TransactionUpdateOptions {
  maxAge: number;
  initialAge?: number;
  staleWhileRevalidate: number;
  surrogateKey?: Array<string>;
  length?: number;
  userMetadata?: ArrayBufferView | ArrayBuffer | URLSearchParams | string;
}

export class TransactionCacheEntry extends CacheEntry {
  public insert(options: TransactionInsertOptions): FastlyBody {
    return new FastlyBody();
  }
  public insertAndStreamBack(options: TransactionInsertOptions): [FastlyBody, CacheEntry] {
    return [new FastlyBody(), new CacheEntry()];
  }
  public update(options: TransactionUpdateOptions) {
    // Do nothing
  }
  public cancel() {
    // Do nothing
  }
}


// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:config-store.d.ts
export class ConfigStore {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  get(key: string): string | null {
    // @note always return null
    return null;
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/device.d.ts
export class Device {
  private _ua: string;

  protected constructor(ua: string) {
    this._ua = ua;
  }

  static lookup(useragent: string): Device | null {
    return new Device(useragent);
  }

  // Following getter methods returns empty string or false because UA won't be parsed in testing.
  // @TODO: actually detect by using some libraries?
  get name(): string | null {
    return "";
  }
  get brand(): string | null {
    return "";
  }
  get model(): string | null {
    return "";
  }
  get hardwareType(): string | null {
    return "";
  }
  get isDesktop(): boolean | null {
    return false;
  }
  get isGameConsole(): boolean | null {
    return false;
  }
  get isMediaPlayer(): boolean | null {
    return false;
  }
  get isMobile(): boolean | null {
    return false;
  }
  get isSmartTV(): boolean | null {
    return false;
  }
  get isTablet(): boolean | null {
    return false;
  }
  get isTouchscreen(): boolean | null {
    return false;
  }
  public toJSON(): Object {
    return {};
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:dictionary.d.ts
export class Dictionary {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  get(key: string): string | null {
    // @note always return null
    return null;
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/edge-rate-limiter.d.ts
export class EdgeRateLimiter {
  private _rc: RateCounter;
  private _pb: PenaltyBox;

  constructor(rateCounter: RateCounter, penaltyBox: PenaltyBox) {
    this._rc = rateCounter;
    this._pb = penaltyBox;
  }

  public checkRate(entry: string, delta: number, window: 1 | 10 | 60, limit: number, timeToLive: number): boolean {
    return false;
  }
}

export class PenaltyBox {
  public name: string;
  private boxes: Array<[string, number]> = [];

  constructor(name: string) {
    this.name = name;
  }

  public add(entry: string, timeToLive: number) {
    this.boxes.push([entry, timeToLive]);
  }

  public has(entry: string): boolean {
    return this.boxes.some((v => v[0] === entry));
  }

}
export class RateCounter {
  public name: string;
  private counters: Map<string, number> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  public increment(entry: string, delta: number) {
    // do nothing
  }

  public lookupRate(entry: string, window: 1 | 10 | 60): number {
    return 0;
  }

  public lookupCount(entry: string, duration: 10 | 20 | 30 | 40 | 50 | 60): number {
    return 0;
  }

}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:env.d.ts
export function env(name: string): string {
  return "";
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:experimental.d.ts
export const sdkVersion = "unknown";

export function setBaseURL(base: URL | null | undefined): void {
  return;
}
export function setDefaultBackend(backend: string): void {
  return;
}
export function enableDebugLogging(enabled: boolean): void {
  return;
}
export function includeBytes(path: string): Uint8Array {
  return new Uint8Array();
}
export function allowDynamicBackends(arg: boolean | {
  connectTimeout?: number;
  firstByteTimeout?: number;
  betweenBytesTimeout?: number;
}): void {
  return;
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly%3Afanout.d.ts
export function createFanoutHandoff(
  request: Request,
  backend: string,
): Response {
  // note that this response is Node.js Response, not a C@E Response
  // but almost cases are OK because Node.js Response class has compatibility for browser Response object.
  return new Response();
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:geolocation.d.ts
export interface Geolocation {
  as_name: string | null;
  as_number: number | null;
  area_code: number | null;
  city: string | null;
  conn_speed: string | null;
  conn_type: string | null;
  continent: string | null;
  country_code: string | null;
  country_code3: string | null;
  country_name: string | null;
  gmt_offset: string | null;
  latitude: number | null;
  longitude: number | null;
  metro_code: number | null;
  postal_code: string | null;
  proxy_description: string | null;
  proxy_type: string | null;
  region: string | null;
  utc_offset: number | null;
}
export function getGeolocationForIpAddress(address: string): Geolocation {
  return {
    as_name: null,
    as_number: null,
    area_code: null,
    city: null,
    conn_speed: null,
    conn_type: null,
    continent: null,
    country_code: null,
    country_code3: null,
    country_name: null,
    gmt_offset: null,
    latitude: null,
    longitude: null,
    metro_code: null,
    postal_code: null,
    proxy_description: null,
    proxy_type: null,
    region: null,
    utc_offset: null,
  };
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:logger.d.ts
export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  log(message: any) {
    console.log(`[FASTLY: ${this.name}] ${JSON.stringify(message)}`);
  }
}

// internal, DO NOT expose
function toString(data: BodyInit): string {
  if (typeof data === "string") {
    return data;
  } else if (data instanceof ArrayBuffer) {
    const view = new Uint8Array(data);
    let str = "";
    for (let i = 0; i < view.byteLength; i++) {
      str += String.fromCharCode(view[i]);
    }
    return str;
  } else if (data instanceof Uint8Array) {
    let str = "";
    for (let i = 0; i < data.byteLength; i++) {
      str += String.fromCharCode(data[i]);
    }
    return str;
  }
  return data.toString();
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:kv-store.d.ts
// type BodyInit = ReadableStream | ArrayBufferView | ArrayBuffer | URLSearchParams | string;
class KVStoreEntry implements KVStoreEntry {
  private data: BodyInit;
  constructor(data: BodyInit) {
    this.data = data;
  }
  get body(): ReadableStream {
    if (this.data instanceof ReadableStream) {
      return this.data;
    }
    return new ReadableStream();
  }
  get bodyUsed(): boolean {
    return false;
  }
  text(): Promise<string> {
    return Promise.resolve(toString(this.data));
  }
  json(): Promise<object> {
    return Promise.resolve(JSON.parse(toString(this.data)));
  }
  arrayBuffer(): Promise<ArrayBuffer> {
    const buf = new Uint8Array();
    const str = toString(this.data);
    for (let i = 0; i < str.length; i++) {
      buf[i] = str[i].charCodeAt(0);
    }
    return Promise.resolve(buf);
  }
}
export class KVStore {
  private name: string;
  private store: { [key: string]: KVStoreEntry } = {};

  constructor(name: string) {
    this.name = name;
  }

  get(key: string): Promise<KVStoreEntry | null> {
    if (key in this.store) {
      return Promise.resolve(this.store[key]);
    }
    return Promise.resolve(null);
  }

  put(key: string, value: BodyInit): Promise<undefined> {
    this.store[key] = new KVStoreEntry(value);
    return Promise.resolve(undefined);
  }
}

// ref: https://github.com/fastly/js-compute-runtime/blob/main/types/fastly:secret-store.d.ts
// Note that SecretStore related class does not seem to be public yet, but just declare for future implementation.
export class SecretStoreEntry {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  plaintext(): string {
    return "";
  }
}

export class SecretStore {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  get(key: string): Promise<SecretStoreEntry | null> {
    return Promise.resolve(null);
  }
}
