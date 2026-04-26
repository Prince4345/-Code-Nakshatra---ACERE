import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  fetchExporterBundle,
  fetchImporterBundle,
  fetchVerifierBundle,
  getCachedExporterBundle,
  getCachedImporterBundle,
  getCachedVerifierBundle,
} from '../services/data';
import {
  ExporterBundle,
  ImporterBundle,
  SessionUser,
  VerifierBundle,
} from '../types';

type BundleContextValue<T> = {
  bundle: T | null;
  loading: boolean;
  refreshing: boolean;
  refresh: (soft?: boolean) => Promise<void>;
};

const ExporterDataContext = createContext<BundleContextValue<ExporterBundle> | null>(null);
const VerifierDataContext = createContext<BundleContextValue<VerifierBundle> | null>(null);
const ImporterDataContext = createContext<BundleContextValue<ImporterBundle> | null>(null);

const showLoadError = (scope: string, error: unknown) => {
  Alert.alert(
    `Unable to load ${scope}`,
    error instanceof Error ? error.message : 'Unknown error',
  );
};

export const ExporterDataProvider = ({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) => {
  const [bundle, setBundle] = useState<ExporterBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bundleRef = useRef<ExporterBundle | null>(null);

  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  const refresh = useCallback(
    async (soft = false) => {
      try {
        if (!soft) {
          const cached = await getCachedExporterBundle(session.id);
          if (cached) {
            setBundle(cached);
            setLoading(false);
          } else {
            setLoading(true);
          }
        } else {
          setRefreshing(true);
        }

        const next = await fetchExporterBundle(session.id, session.role);
        setBundle(next);
      } catch (error) {
        if (!bundleRef.current) showLoadError('exporter workspace', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.id, session.role],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ bundle, loading, refreshing, refresh }),
    [bundle, loading, refreshing, refresh],
  );

  return <ExporterDataContext.Provider value={value}>{children}</ExporterDataContext.Provider>;
};

export const VerifierDataProvider = ({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) => {
  const [bundle, setBundle] = useState<VerifierBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bundleRef = useRef<VerifierBundle | null>(null);

  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  const refresh = useCallback(
    async (soft = false) => {
      try {
        if (!soft) {
          const cached = await getCachedVerifierBundle(session.id);
          if (cached) {
            setBundle(cached);
            setLoading(false);
          } else {
            setLoading(true);
          }
        } else {
          setRefreshing(true);
        }

        const next = await fetchVerifierBundle(session.id, session.role);
        setBundle(next);
      } catch (error) {
        if (!bundleRef.current) showLoadError('verifier queue', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.id, session.role],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ bundle, loading, refreshing, refresh }),
    [bundle, loading, refreshing, refresh],
  );

  return <VerifierDataContext.Provider value={value}>{children}</VerifierDataContext.Provider>;
};

export const ImporterDataProvider = ({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) => {
  const [bundle, setBundle] = useState<ImporterBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bundleRef = useRef<ImporterBundle | null>(null);

  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  const refresh = useCallback(
    async (soft = false) => {
      try {
        if (!soft) {
          const cached = await getCachedImporterBundle(session.id);
          if (cached) {
            setBundle(cached);
            setLoading(false);
          } else {
            setLoading(true);
          }
        } else {
          setRefreshing(true);
        }

        const next = await fetchImporterBundle(session.id, session.role);
        setBundle(next);
      } catch (error) {
        if (!bundleRef.current) showLoadError('importer handoff', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.id, session.role],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ bundle, loading, refreshing, refresh }),
    [bundle, loading, refreshing, refresh],
  );

  return <ImporterDataContext.Provider value={value}>{children}</ImporterDataContext.Provider>;
};

const useBundleContext = <T,>(context: React.Context<BundleContextValue<T> | null>, name: string) => {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used within its provider.`);
  return value;
};

export const useExporterData = () => useBundleContext(ExporterDataContext, 'useExporterData');
export const useVerifierData = () => useBundleContext(VerifierDataContext, 'useVerifierData');
export const useImporterData = () => useBundleContext(ImporterDataContext, 'useImporterData');
