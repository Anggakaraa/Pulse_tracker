-- Add "recovery" to the event_type check constraint on glucomove_events
-- Covers: ice bath, cold plunge, sauna, massage, deliberate recovery sessions
ALTER TABLE glucomove_events
  DROP CONSTRAINT IF EXISTS glucomove_events_event_type_check;

ALTER TABLE glucomove_events
  ADD CONSTRAINT glucomove_events_event_type_check
  CHECK (event_type IN (
    'stress', 'exercise', 'recovery', 'alcohol', 'illness',
    'sleep', 'travel', 'fasting', 'medication', 'other'
  ));
