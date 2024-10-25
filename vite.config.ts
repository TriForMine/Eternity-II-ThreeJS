import {defineConfig} from "vite";
import {biomePlugin} from '@pbr1111/vite-plugin-biome';

export default defineConfig({
    base: "/Eternity-II-ThreeJS",
    plugins: [biomePlugin({
        path: "src",
        errorOnWarnings: true,
        args: '--write'
    })],
});