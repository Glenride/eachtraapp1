// Type declarations for fft.js library
declare module 'fft.js' {
    export default class FFT {
        constructor(size: number);
        transform(output: number[], input: number[]): void;
        inverseTransform(output: number[], input: number[]): void;
        completeSpectrum(spectrum: number[]): void;
        toComplexArray(input: number[], output?: number[]): number[];
        fromComplexArray(complex: number[], output?: number[]): number[];
    }
}
