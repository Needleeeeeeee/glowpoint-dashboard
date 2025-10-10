"use client";
import React, { useState, useEffect } from "react";
import { useAdminQueue } from "@/hooks/useAdminQueue";

import { Button } from "@/components/ui/button";
import {
  Play,
  Check,
  RefreshCw,
  PartyPopper,
  BellRing,
  MoveUp,
  Loader2,
} from "lucide-react";
export const QueueWidget: React.FC = () => {
  const {
    queue,
    currentServing,
    loading,
    error,
    stats,
    advanceQueue,
    notifyNext,
    resetQueue,
  } = useAdminQueue();
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    // Set the initial time
    setCurrentTime(new Date().toLocaleTimeString());

    // Update the time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <div className="text-red-600">
        <h3 className="font-semibold">Error Loading Queue</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2">
        <Button
          onClick={advanceQueue}
          disabled={loading || queue.length === 0}
          variant="default"
          size="sm"
          className="hover:cursor-pointer"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Next Customer
        </Button>
        <Button
          onClick={resetQueue}
          disabled={loading}
          variant="destructive"
          size="sm"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Queue
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">
            #{currentServing}
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-300">Now Serving</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {queue.length}
          </div>
          <div className="text-sm text-orange-800 dark:text-orange-300">In Queue</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.totalToday}
          </div>
          <div className="text-sm text-green-800 dark:text-green-300">Served Today</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.averageWaitTime}m
          </div>
          <div className="text-sm text-purple-800 dark:text-purple-300">Avg Wait</div>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        <h3 className="font-medium text-foreground/80 mb-3">Upcoming Customers</h3>
        {queue.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <PartyPopper className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
            <p>No one in queue</p>
          </div>
        ) : (
          queue
            .sort((a, b) => a.position - b.position)
            .slice(0, 8) // Show only next 8
            .map((item, index) => (
              <div
                key={item.id}
                className={`flex justify-between items-center p-3 rounded transition-colors ${
                  index === 0
                    ? "bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? "bg-yellow-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                    #{item.position}
                  </div>
                  <div className="w-40 truncate">
                    <div className="font-medium">
                      {index === 0 && (
                        <MoveUp className="inline-block mr-1 h-4 w-4 text-muted-foreground" />
                      )}
                      Next: ~{item.estimated_wait_time} min wait
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.email} | {item.phone || "No phone"}
                    </div>
                    <div className="text-xs text-gray-500">
                      QR: {item.qr_code} | {item.user_id.substring(0, 10)}...
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {index === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={notifyNext}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <BellRing className="mr-2 h-3 w-3" />
                          Notify
                        </>
                      )}
                    </Button>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
        )}
        {queue.length > 8 && (
          <p className="text-sm text-gray-500 text-center pt-2">
            +{queue.length - 8} more in queue
          </p>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          Real-time updates enabled
        </div>
        <div className="text-xs text-gray-400">
          Last updated: {currentTime}
        </div>
      </div>
    </div>
  );
};
