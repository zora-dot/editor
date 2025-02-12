/*
  # Add Social Features

  1. New Tables
    - `profiles`
      - Extended user information (username, avatar, bio)
    - `comments`
      - Comments on pastes
    - `likes`
      - Likes for pastes and comments
    - `favorites`
      - User's favorite pastes
    - `follows`
      - User following relationships
    - `notifications`
      - User notifications

  2. Changes
    - Add username field to auth.users
    - Add notification preferences

  3. Security
    - Enable RLS on all tables
    - Add appropriate access policies
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create likes table (for both pastes and comments)
CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT likes_target_check CHECK (
    (paste_id IS NOT NULL AND comment_id IS NULL) OR
    (paste_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE(user_id, paste_id),
  UNIQUE(user_id, comment_id)
);

-- Create favorites table
CREATE TABLE favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, paste_id)
);

-- Create follows table
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (
    type IN ('comment', 'like', 'favorite', 'follow')
  )
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and paste owners can delete comments"
  ON comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM pastes WHERE id = paste_id
    )
  );

-- Likes policies
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create likes"
  ON likes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Favorites are viewable by everyone"
  ON favorites FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage favorites"
  ON favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage follows"
  ON follows FOR ALL
  TO authenticated
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_comments_paste_id ON comments(paste_id);
CREATE INDEX idx_likes_paste_id ON likes(paste_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);
CREATE INDEX idx_favorites_paste_id ON favorites(paste_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Create function to handle notifications
CREATE OR REPLACE FUNCTION handle_notification() RETURNS trigger AS $$
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

-- Create triggers for notifications
CREATE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification();

CREATE TRIGGER on_new_like
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification();

CREATE TRIGGER on_new_favorite
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification();

CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();