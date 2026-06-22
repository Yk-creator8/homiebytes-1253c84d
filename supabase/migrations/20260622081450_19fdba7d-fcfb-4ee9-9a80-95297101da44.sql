
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  events jsonb NOT NULL DEFAULT '{
    "placed": ["email"],
    "accepted": ["email"],
    "preparing": ["email"],
    "ready": ["email"],
    "out_for_delivery": ["email","sms"],
    "delivered": ["email"],
    "rejected": ["email"]
  }'::jsonb,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time NOT NULL DEFAULT '22:00',
  quiet_hours_end time NOT NULL DEFAULT '07:00',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
