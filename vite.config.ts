import {sveltekit} from '@sveltejs/kit/vite';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        host: true,
        port: 3000
    },
    preview: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: ['ag-sc.techfak.uni-bielefeld.de'] // Add your domain here
    }
});