-- Add proper foreign key relationship for actor_id in notifications table
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey,
ADD CONSTRAINT notifications_actor_id_fkey 
  FOREIGN KEY (actor_id) 
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Create index for actor_id lookups
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id 
ON notifications(actor_id);

-- Update notification trigger to ensure actor has a profile
CREATE OR REPLACE FUNCTION handle_notification() 
RETURNS trigger AS $$
BEGIN
  -- Only create notification if actor has a profile
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = NEW.actor_id
    ) THEN
      RETURN NULL;
    END IF;

    IF TG_TABLE_NAME = 'comments' THEN
      -- Notify paste owner about new comment
      INSERT INTO notifications (user_id, actor_id, type, paste_id, comment_id)
      SELECT p.user_id, NEW.user_id, 'comment', NEW.paste_id, NEW.id
      FROM pastes p
      WHERE p.id = NEW.paste_id AND p.user_id != NEW.user_id;
    ELSIF TG_TABLE_NAME = 'likes' THEN
      IF NEW.paste_id IS NOT NULL THEN
        -- Notify paste owner about like
        INSERT INTO notifications (user_id, actor_id, type, paste_id)
        SELECT p.user_id, NEW.user_id, 'like', NEW.paste_id
        FROM pastes p
        WHERE p.id = NEW.paste_id AND p.user_id != NEW.user_id;
      ELSE
        -- Notify comment owner about like
        INSERT INTO notifications (user_id, actor_id, type, comment_id)
        SELECT c.user_id, NEW.user_id, 'like', NEW.comment_id
        FROM comments c
        WHERE c.id = NEW.comment_id AND c.user_id != NEW.user_id;
      END IF;
    ELSIF TG_TABLE_NAME = 'favorites' THEN
      -- Notify paste owner about favorite
      INSERT INTO notifications (user_id, actor_id, type, paste_id)
      SELECT p.user_id, NEW.user_id, 'favorite', NEW.paste_id
      FROM pastes p
      WHERE p.id = NEW.paste_id AND p.user_id != NEW.user_id;
    ELSIF TG_TABLE_NAME = 'follows' THEN
      -- Notify user about new follower
      INSERT INTO notifications (user_id, actor_id, type)
      VALUES (NEW.following_id, NEW.follower_id, 'follow');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();