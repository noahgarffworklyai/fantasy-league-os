const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

function resolveFromProject(moduleName) {
  try {
    return require.resolve(moduleName, { paths: [projectRoot] });
  } catch {
    return null;
  }
}

function shouldPinReact(moduleName) {
  return (
    moduleName === 'react' ||
    moduleName.startsWith('react/') ||
    moduleName === 'react-dom' ||
    moduleName.startsWith('react-dom/')
  );
}

function isWebViewOrigin(originModulePath) {
  return originModulePath.includes(`${path.sep}react-native-webview${path.sep}`);
}

module.exports = (() => {
  const merged = withNativeWind(config, { input: './global.css' });
  const defaultResolveRequest = merged.resolver.resolveRequest;

  merged.resolver.resolveRequest = (context, moduleName, platform) => {
    if (shouldPinReact(moduleName)) {
      const pinned = resolveFromProject(moduleName);
      if (pinned) {
        return { type: 'sourceFile', filePath: pinned };
      }
    }

    // Hoisted react-native-webview must use the same react-native copy as the app.
    if (
      isWebViewOrigin(context.originModulePath) &&
      (moduleName === 'react-native' || moduleName.startsWith('react-native/'))
    ) {
      const pinned = resolveFromProject(moduleName);
      if (pinned) {
        return { type: 'sourceFile', filePath: pinned };
      }
    }

    // Always use compiled lib entry — avoid src/ + lib/ both registering RNCWebView.
    if (moduleName === 'react-native-webview') {
      const pinned = resolveFromProject('react-native-webview');
      if (pinned) {
        return { type: 'sourceFile', filePath: pinned };
      }
    }

    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return merged;
})();
