import { Config } from '@remotion/cli/config';

// WebGL: "angle" usa a GPU no Mac/Windows. Em servidor sem GPU, use --gl=swangle.
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(1);
Config.setOverwriteOutput(true);
