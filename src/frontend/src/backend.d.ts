import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface KeyRecord {
    durationDays: bigint;
    expiryTimestamp: bigint;
    createdAt: bigint;
    keyValue: string;
    boundDeviceId?: string;
}
export interface ValidationResult {
    expiryTimestamp?: bigint;
    valid: boolean;
    message: string;
    isAdmin: boolean;
}
export interface backendInterface {
    clearAllKeys(adminKey: string): Promise<boolean>;
    deleteKey(adminKey: string, keyValue: string): Promise<boolean>;
    generateKey(adminKey: string, durationDays: bigint): Promise<string>;
    getKeys(adminKey: string): Promise<Array<KeyRecord>>;
    validateAndBindKey(keyValue: string, deviceId: string): Promise<ValidationResult>;
}
