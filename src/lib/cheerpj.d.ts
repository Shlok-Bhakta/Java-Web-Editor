declare global {
    const cheerpjInit: (options?: object) => Promise<void>;
    const cheerpjRunMain: any;
    const cheerpjRunJar: any;
    const cheerpjRunLibrary: any;
    const cheerpjCreateDisplay: any;
    const cjFileBlob: any;
    const cjGetRuntimeResources: any;
    const cjGetProguardConfiguration: any;
    const dumpMethod: any;
    const dumpClass: any;
    const dumpAllThreads: any;
    const cheerpjAddStringFile: any;
}

export {};
