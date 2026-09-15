import {defineConfig} from "vite";
import react, {reactCompilerPreset} from "@vitejs/plugin-react";
import wails from "@wailsio/runtime/plugins/vite";
import babel from '@rolldown/plugin-babel';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: "127.0.0.1",
        port: Number(process.env.WAILS_VITE_PORT) || 9245,
        strictPort: true,
    },
    plugins: [
        react(),
        wails("./bindings"),
        babel({
            presets: [reactCompilerPreset()]
        }),
    ],
});
