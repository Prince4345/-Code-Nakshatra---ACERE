import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ProductShell, RuntimeBanner, TabChip } from './ui';
import { SessionUser } from '../types';
import { palette } from '../theme';
import {
  createMobileWorkspaceSession,
  type WorkspaceTab,
  WORKSPACE_TABS,
} from '../services/workspaceSession';

type WorkspaceWebShellProps = {
  session: SessionUser;
  onLogout: () => Promise<void>;
};

type MobileBridgeMessage =
  | {
      type: 'route';
      path?: string;
      search?: string;
      href?: string;
    }
  | {
      type: 'download';
      fileName?: string;
      contentType?: string;
      contentBase64?: string;
    };

const ROUTE_BRIDGE_SCRIPT = `
(function() {
  if (window.__CT_NATIVE_ROUTE_BRIDGE__) {
    return true;
  }
  window.__CT_NATIVE_ROUTE_BRIDGE__ = true;
  var sendRoute = function() {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'route',
        path: window.location.pathname,
        search: window.location.search,
        href: window.location.href
      }));
    } catch (error) {}
  };
  var wrapHistory = function(method) {
    var original = window.history[method];
    window.history[method] = function() {
      var result = original.apply(this, arguments);
      setTimeout(sendRoute, 0);
      return result;
    };
  };
  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', sendRoute);
  window.addEventListener('hashchange', sendRoute);
  setTimeout(sendRoute, 0);
  return true;
})();
true;
`;

const buildInAppRouteScript = (route: string) => `
(function() {
  var target = ${JSON.stringify(route)};
  if (window.location.pathname !== target) {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  true;
})();
true;
`;

const sanitizeFileName = (value: string) => value.replace(/[<>:"/\\\\|?*]+/g, '-');

const ensureDirectory = async (directory: string) => {
  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch {
    // best effort
  }
};

const saveDownloadToDevice = async (fileName: string, contentBase64: string, contentType = 'application/octet-stream') => {
  const baseDirectory = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}carbontrace-downloads/`;
  if (!baseDirectory) {
    throw new Error('Storage is unavailable on this device.');
  }

  await ensureDirectory(baseDirectory);
  const targetUri = `${baseDirectory}${sanitizeFileName(fileName)}`;
  await FileSystem.writeAsStringAsync(targetUri, contentBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      mimeType: contentType,
      dialogTitle: fileName,
      UTI: contentType,
    });
    return;
  }

  Alert.alert('File ready', `${fileName} has been prepared on this device.`);
};

const findActiveTab = (tabs: WorkspaceTab[], path: string) =>
  tabs.reduce<WorkspaceTab | null>((best, current) => {
    if (path === current.route || path.startsWith(`${current.route}/`)) {
      if (!best || current.route.length > best.route.length) return current;
    }
    return best;
  }, null);

export const WorkspaceWebShell = ({ session, onLogout }: WorkspaceWebShellProps) => {
  const tabs = WORKSPACE_TABS[session.role];
  const defaultRoute = tabs[0]?.route ?? '/';
  const webViewRef = useRef<WebView>(null);
  const [initialUrl, setInitialUrl] = useState<string>('');
  const [currentPath, setCurrentPath] = useState(defaultRoute);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [webReady, setWebReady] = useState(false);

  const title =
    session.role === 'exporter'
      ? 'Exporter workspace'
      : session.role === 'verifier'
        ? 'Verifier workspace'
        : 'Importer workspace';

  const subtitle = 'Full CarbonTrace workflow inside the app.';

  const activeTab = useMemo(() => findActiveTab(tabs, currentPath), [tabs, currentPath]);

  const hydrateWorkspace = async (targetRoute: string) => {
    setBooting(true);
    setRuntimeError(null);
    try {
      const nextSession = await createMobileWorkspaceSession(targetRoute);
      setWorkspaceId(nextSession.workspaceId);
      setCurrentPath(targetRoute);
      setInitialUrl(nextSession.initialUrl);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'The mobile workspace could not be opened.');
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    void hydrateWorkspace(defaultRoute);
  }, [defaultRoute, session.id]);

  const openTab = async (tab: WorkspaceTab) => {
    setCurrentPath(tab.route);
    if (!webReady || !initialUrl) {
      await hydrateWorkspace(tab.route);
      return;
    }
    webViewRef.current?.injectJavaScript(buildInAppRouteScript(tab.route));
  };

  const reloadWorkspace = async () => {
    if (!initialUrl) {
      await hydrateWorkspace(currentPath || defaultRoute);
      return;
    }
    setReloading(true);
    setRuntimeError(null);
    webViewRef.current?.reload();
  };

  const handleBridgeMessage = async (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as MobileBridgeMessage;
      if (payload.type === 'route') {
        const nextPath = payload.path || defaultRoute;
        setCurrentPath(nextPath);
        setWebReady(true);
        return;
      }
      if (payload.type === 'download' && payload.fileName && payload.contentBase64) {
        await saveDownloadToDevice(payload.fileName, payload.contentBase64, payload.contentType);
      }
    } catch {
      // Ignore malformed bridge messages from the page.
    }
  };

  return (
    <ProductShell
      session={session}
      title={title}
      subtitle={subtitle}
      onLogout={onLogout}
      tabs={tabs.map((tab) => (
        <TabChip
          key={tab.key}
          active={activeTab?.key === tab.key}
          label={tab.label}
          icon={tab.icon as keyof typeof Feather.glyphMap}
          onPress={() => void openTab(tab)}
        />
      ))}
      banner={
        runtimeError ? (
          <RuntimeBanner
            title="Workspace unavailable"
            body={runtimeError}
            tone="bad"
            action={
              <Pressable style={styles.bannerAction} onPress={() => void hydrateWorkspace(currentPath || defaultRoute)}>
                <Text style={styles.bannerActionText}>Retry</Text>
              </Pressable>
            }
          />
        ) : (
          <RuntimeBanner
            title="Full workspace mode"
            body={workspaceId ? `${workspaceId} signed in. All website tools stay available here.` : 'All website tools stay available here.'}
            tone="neutral"
          />
        )
      }
    >
      <View style={styles.toolbar}>
        <View style={styles.toolbarPath}>
          <Feather name="globe" size={15} color={palette.brandBright} />
          <Text numberOfLines={1} style={styles.toolbarPathText}>
            {currentPath}
          </Text>
        </View>
        <Pressable style={styles.toolbarButton} onPress={() => webViewRef.current?.goBack()}>
          <Feather name="arrow-left" size={15} color={palette.text} />
        </Pressable>
        <Pressable style={styles.toolbarButton} onPress={() => webViewRef.current?.goForward()}>
          <Feather name="arrow-right" size={15} color={palette.text} />
        </Pressable>
        <Pressable style={styles.toolbarButton} onPress={() => void reloadWorkspace()}>
          <Feather name="refresh-cw" size={15} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.webFrame}>
        {booting || !initialUrl ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={palette.brandBright} />
            <Text style={styles.loadingTitle}>Opening CarbonTrace</Text>
            <Text style={styles.loadingBody}>Signing into the full workspace for this device.</Text>
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: initialUrl }}
              style={styles.webView}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              injectedJavaScriptBeforeContentLoaded={ROUTE_BRIDGE_SCRIPT}
              onMessage={(event) => void handleBridgeMessage(event)}
              onLoadStart={() => {
                setPageLoading(true);
                setReloading(false);
              }}
              onLoadEnd={() => {
                setPageLoading(false);
                setReloading(false);
              }}
              onError={(event) => {
                setPageLoading(false);
                setReloading(false);
                setRuntimeError(event.nativeEvent.description || 'The workspace failed to load.');
              }}
              setSupportMultipleWindows={false}
              allowsBackForwardNavigationGestures
            />
            {(pageLoading || reloading) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={palette.brandBright} />
              </View>
            )}
          </>
        )}
      </View>
    </ProductShell>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  toolbarPath: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelElevated,
  },
  toolbarPathText: {
    flex: 1,
    color: palette.mutedStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.panelElevated,
    borderWidth: 1,
    borderColor: palette.line,
  },
  webFrame: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: palette.panel,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  loadingBody: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 20, 34, 0.82)',
    borderWidth: 1,
    borderColor: palette.line,
  },
  bannerAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.badLine,
    backgroundColor: palette.panel,
  },
  bannerActionText: {
    color: palette.text,
    fontWeight: '700',
  },
});
