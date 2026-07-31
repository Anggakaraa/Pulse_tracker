alter table glucomove_meals
  alter column primary_carb_source type text[]
  using array[primary_carb_source];
