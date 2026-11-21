import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { finishPendingUploads } from '../services/pendingUploads';

/**
 * Invisible helper: once a student's payment is confirmed, uploads the documents their browser has
 * been holding for them. Runs on load, when they come back to the tab, and every 20 seconds.
 */
export default function PendingUploadFinisher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return undefined;
    let stopped = false;
    let busy = false;

    const run = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const done = await finishPendingUploads(user.id);
        if (done > 0 && !stopped) toast.success('Payment confirmed — your application documents have been submitted!');
      } finally {
        busy = false;
      }
    };

    run();
    const timer = setInterval(run, 20000);
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [user]);

  return null;
}
