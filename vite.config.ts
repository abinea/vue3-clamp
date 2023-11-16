import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import VueMacros from 'unplugin-vue-macros/vite';
import VueJsx from '@vitejs/plugin-vue-jsx';

export default defineConfig({
  plugins: [
    VueMacros({
      exportExpose: true,
      exportRender: true,
      plugins: {
        vue: Vue({
          include: [/\.vue$/],
          script: {
            defineModel: true,
            propsDestructure: true,
          },
        }),
        vueJsx: VueJsx(),
      },
    }),
  ],
});
