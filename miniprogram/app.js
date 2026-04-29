const { ensurePlanInit } = require('./utils/storage.js');
const { ensureUserStorageNamespace } = require('./utils/userStorageMigration.js');

App({
  onLaunch() {
    ensurePlanInit();
  },
  onShow() {
    // 登录后将旧 key 迁移到用户命名空间（只复制，不删除）
    ensureUserStorageNamespace();
    ensurePlanInit();
  },
});
