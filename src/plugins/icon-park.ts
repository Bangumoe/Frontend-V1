// src/plugins/icon-park.ts
import type { App } from 'vue';
import * as IconParkIcons from '@icon-park/vue-next/es/map'; // Import all icons

export default {
  install(app: App) {
    for (const iconName in IconParkIcons) {
      if (Object.prototype.hasOwnProperty.call(IconParkIcons, iconName)) {
        // iconName will be like 'Home', 'Search', etc.
        // Register component globally
        // (IconParkIcons as any) is used because TypeScript might not know all keys beforehand
        app.component(iconName, (IconParkIcons as any)[iconName]);
      }
    }
  }
};