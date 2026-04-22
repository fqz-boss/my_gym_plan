const { ensurePlanInit } = require('./utils/storage.js');

App({
  onLaunch() {
    ensurePlanInit();
  },
});
