export declare const SKILL_DIR: string;
export declare const ZIP_PATH: string;
export declare function skillFiles(dir?: string): Array<{ name: string; data: Buffer }>;
export declare function buildZip(files: Array<{ name: string; data: Buffer }>): Buffer;
