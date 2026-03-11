import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on one or more Supabase tables.
 * Calls `onUpdate` whenever an INSERT, UPDATE, or DELETE occurs.
 */
export function useRealtimeSubscription(
  tables: string | string[],
  onUpdate: () => void,
  channelName?: string
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const tableList = Array.isArray(tables) ? tables : [tables];
    const name = channelName || `rt-${tableList.join("-")}`;

    let channel = supabase.channel(name);

    tableList.forEach((table) => {
      channel = channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => {
          onUpdateRef.current();
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables, channelName]);
}
