-- Migration 015: Fiber prominence on meals

alter table glucomove_meals
  add column if not exists fiber_prominence text
    check (fiber_prominence in ('low', 'moderate', 'high'));
