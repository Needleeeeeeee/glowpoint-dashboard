"use client";
import { useState, useEffect, useTransition } from 'react';
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {  getAdminQueueState,
  advanceQueue,
  resetQueue,
  getQueueStats,
  notifyNextInQueue,
  QueueEntry
} from '../actions';
import { subscribeToAdminQueueChanges } from '@/utils/queue';

interface QueueStats {
  totalToday: number;
  averageWaitTime: number;
  currentQueueLength: number;
}

export const useAdminQueue = () => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentServing, setCurrentServing] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<QueueStats>({
    totalToday: 0,
    averageWaitTime: 0,
    currentQueueLength: 0
  });

  const fetchQueue = async () => {
    try {
      setError(null);
      const result = await getAdminQueueState();
      if (result.success && result.data) {
        setQueue(result.data.queue);
        setCurrentServing(result.data.currentServing);
      } else {
        setError(result.error || 'Failed to fetch queue');
      }
    } catch (err: any) {
      console.error('Failed to fetch queue:', err);
      setError('Failed to load queue data');
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getQueueStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleAdvanceQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await advanceQueue();
      if (result.success) {
        await fetchQueue();
        await fetchStats();
      } else {
        setError(result.error || 'Failed to advance queue');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to advance queue');
    } finally {
      setLoading(false);
    }
  };

  const handleResetQueue = async () => {
    if (!confirm('Are you sure you want to reset the queue? This will remove all entries.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resetQueue();
      if (result.success) {
        await fetchQueue();
        await fetchStats();
      } else {
        setError(result.error || 'Failed to reset queue');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset queue');
    } finally {
      setLoading(false);
    }
  };

  const notifyNext = async () => {
    startTransition(async () => {
      setLoading(true);
      const result = await notifyNextInQueue();
      if (result?.error) {
        toast.error("Failed to send notification", {
          description: result.error,
        });
      } else {
        toast.success("Queue notification sent successfully!");
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchQueue();
    fetchStats();

    // Subscribe to real-time updates
    let subscription: any;
    const client = createClient();
    subscription = subscribeToAdminQueueChanges(client, () => {
      fetchQueue();
      fetchStats();
    });

    // Fallback polling
    const interval = setInterval(() => {
      fetchQueue();
      fetchStats();
    }, 10000); // Every 10 seconds

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(interval);
    };
  }, []);

  const activeQueue = queue.filter(item => item.is_active && item.position > 0);

  return {
    queue: activeQueue,
    currentServing,
    loading: loading || isPending,
    error,
    stats,
    advanceQueue: handleAdvanceQueue,
    resetQueue: handleResetQueue,
    fetchQueue,
    fetchStats,
    notifyNext,
  };
};
