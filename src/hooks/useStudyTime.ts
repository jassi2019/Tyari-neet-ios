import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'taiyari_study_time_v1';

type StudyData = {
  totalSeconds: number;
  lastDate: string;
  dailySeconds: number;
};

const getToday = () => new Date().toISOString().split('T')[0];

const load = async (): Promise<StudyData> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.lastDate !== getToday()) {
        return { totalSeconds: d.totalSeconds || 0, lastDate: getToday(), dailySeconds: 0 };
      }
      return d;
    }
  } catch {}
  return { totalSeconds: 0, lastDate: getToday(), dailySeconds: 0 };
};

const save = async (data: StudyData) => {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

export const useStudyTime = () => {
  const [data, setData] = useState<StudyData>({ totalSeconds: 0, lastDate: getToday(), dailySeconds: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);

  useEffect(() => { load().then(d => { setData(d); dataRef.current = d; }); }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const updated = {
        ...dataRef.current,
        totalSeconds: dataRef.current.totalSeconds + 1,
        dailySeconds: dataRef.current.dailySeconds + 1,
      };
      dataRef.current = updated;
      setData(updated);
      if (updated.totalSeconds % 10 === 0) save(updated);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      save(dataRef.current);
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, []);

  return {
    totalSeconds: data.totalSeconds,
    dailySeconds: data.dailySeconds,
    totalTime: formatTime(data.totalSeconds),
    dailyTime: formatTime(data.dailySeconds),
    startTimer,
    stopTimer,
    hasData: data.totalSeconds > 0,
  };
};
