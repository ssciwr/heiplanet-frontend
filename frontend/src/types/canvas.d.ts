// temporary shim...
declare module "canvas" {
	export const createCanvas: (...args: unknown[]) => {
		getContext: (...ctxArgs: unknown[]) => unknown;
		toBuffer: (...bufferArgs: unknown[]) => Buffer;
	};
	export type CanvasRenderingContext2D = unknown;
}
