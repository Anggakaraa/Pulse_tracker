alter table glucomove_meals
  add column if not exists protein_prominence text
    check (protein_prominence in ('low', 'moderate', 'high'));
