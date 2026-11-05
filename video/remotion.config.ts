import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
// WebGL: "angle" usa a GPU no Mac/Windows. Em servidor sem GPU, use --gl=swangle.
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
