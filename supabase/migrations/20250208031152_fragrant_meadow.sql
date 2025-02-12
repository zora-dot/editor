-- Drop existing notification triggers
DROP TRIGGER IF EXISTS on_new_like ON likes;
DROP TRIGGER IF EXISTS on_new_favorite ON favorites;

-- Update the notification handler function
CREATE OR REPLACE FUNCTION handle_notification() 
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
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

-- Recreate the triggers
CREATE TRIGGER on_new_like
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification();

CREATE TRIGGER on_new_favorite
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification();

-- Update likes table to ensure user_id is set
ALTER TABLE likes 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update likes policies to include user_id
DROP POLICY IF EXISTS "Anyone can create likes" ON likes;
CREATE POLICY "Authenticated users can create likes"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update favorites policies
DROP POLICY IF EXISTS "Authenticated users can manage favorites" ON favorites;
CREATE POLICY "Authenticated users can manage favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);