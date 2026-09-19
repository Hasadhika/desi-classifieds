/*
  # Seed Canadian Classifieds Categories and Fields

  ## Overview
  This migration populates the database with Canadian classifieds-specific categories,
  subcategories, and their associated custom form fields.

  ## Categories Being Added
  1. **Real Estate** - Basement Rental, Room Sharing, PG Accommodation, Apartment, Condo
  2. **Vehicles** - Used Cars, Carpooling, Car Services, Driving Instructors
  3. **Jobs** - IT Jobs, Trucking, Restaurant, Survival Jobs, Referrals
  4. **Services** - Immigration, Accountants, Realtors, Tutors, Catering, Event Decorators
  5. **Buy & Sell** - Furniture, Electronics, Grocery, Jewelry
  6. **Community** - Cultural Events, Temple Events, Volunteering, Festivals

  ## Custom Fields Per Category
  - Real Estate: bedrooms, bathrooms, availability_date, lease_type, utilities_included, furnishing
  - Vehicles: make, model, year, mileage, fuel_type, transmission, condition
  - Jobs: job_title, company_name, job_type, salary_range, experience_required
  - Services: service_type, hourly_rate, availability, certifications
  - Buy & Sell: condition, brand, age, warranty
  - Community: event_date, event_time, location_details, organizer

  ## Important Notes
  - Clears existing categories and fields first
  - Uses fixed UUIDs for predictable references
  - All categories start as active and visible
*/

-- Clear existing data (cascade will handle related records)
DELETE FROM category_fields;
DELETE FROM categories;

-- Insert parent categories (Real Estate, Vehicles, Jobs, Services, Buy & Sell, Community)
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('11111111-1111-1111-1111-000000000001', NULL, 'real_estate', 'Real Estate', 1),
  ('11111111-1111-1111-1111-000000000002', NULL, 'vehicles', 'Vehicles', 2),
  ('11111111-1111-1111-1111-000000000003', NULL, 'jobs', 'Jobs', 3),
  ('11111111-1111-1111-1111-000000000004', NULL, 'services', 'Services', 4),
  ('11111111-1111-1111-1111-000000000005', NULL, 'buy_sell', 'Buy & Sell', 5),
  ('11111111-1111-1111-1111-000000000006', NULL, 'community', 'Community', 6);

-- Insert Real Estate subcategories
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('22222222-1111-1111-1111-000000000001', '11111111-1111-1111-1111-000000000001', 'basement_rental', 'Basement Rental', 1),
  ('22222222-1111-1111-1111-000000000002', '11111111-1111-1111-1111-000000000001', 'room_sharing', 'Room Sharing', 2),
  ('22222222-1111-1111-1111-000000000003', '11111111-1111-1111-1111-000000000001', 'pg_accommodation', 'PG Accommodation', 3),
  ('22222222-1111-1111-1111-000000000004', '11111111-1111-1111-1111-000000000001', 'apartment', 'Apartment', 4),
  ('22222222-1111-1111-1111-000000000005', '11111111-1111-1111-1111-000000000001', 'condo', 'Condo', 5);

-- Insert Vehicles subcategories
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('22222222-2222-1111-1111-000000000001', '11111111-1111-1111-1111-000000000002', 'used_cars', 'Used Cars', 1),
  ('22222222-2222-1111-1111-000000000002', '11111111-1111-1111-1111-000000000002', 'carpooling', 'Carpooling', 2),
  ('22222222-2222-1111-1111-000000000003', '11111111-1111-1111-1111-000000000002', 'car_services', 'Car Services', 3),
  ('22222222-2222-1111-1111-000000000004', '11111111-1111-1111-1111-000000000002', 'driving_instructors', 'Driving Instructors', 4);

-- Insert Jobs subcategories
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('22222222-3333-1111-1111-000000000001', '11111111-1111-1111-1111-000000000003', 'it_jobs', 'IT Jobs', 1),
  ('22222222-3333-1111-1111-000000000002', '11111111-1111-1111-1111-000000000003', 'trucking', 'Trucking', 2),
  ('22222222-3333-1111-1111-000000000003', '11111111-1111-1111-1111-000000000003', 'restaurant', 'Restaurant', 3),
  ('22222222-3333-1111-1111-000000000004', '11111111-1111-1111-1111-000000000003', 'survival_jobs', 'Survival Jobs', 4),
  ('22222222-3333-1111-1111-000000000005', '11111111-1111-1111-1111-000000000003', 'referrals', 'Referrals', 5);

-- Insert Services subcategories
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('22222222-4444-1111-1111-000000000001', '11111111-1111-1111-1111-000000000004', 'immigration', 'Immigration', 1),
  ('22222222-4444-1111-1111-000000000002', '11111111-1111-1111-1111-000000000004', 'accountants', 'Accountants', 2),
  ('22222222-4444-1111-1111-000000000003', '11111111-1111-1111-1111-000000000004', 'realtors', 'Realtors', 3),
  ('22222222-4444-1111-1111-000000000004', '11111111-1111-1111-1111-000000000004', 'tutors', 'Tutors', 4),
  ('22222222-4444-1111-1111-000000000005', '11111111-1111-1111-1111-000000000004', 'catering', 'Catering', 5),
  ('22222222-4444-1111-1111-000000000006', '11111111-1111-1111-1111-000000000004', 'event_decorators', 'Event Decorators', 6);

-- Insert Buy & Sell subcategories
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('22222222-5555-1111-1111-000000000001', '11111111-1111-1111-1111-000000000005', 'furniture', 'Furniture', 1),
  ('22222222-5555-1111-1111-000000000002', '11111111-1111-1111-1111-000000000005', 'electronics', 'Electronics', 2),
  ('22222222-5555-1111-1111-000000000003', '11111111-1111-1111-1111-000000000005', 'grocery', 'Grocery', 3),
  ('22222222-5555-1111-1111-000000000004', '11111111-1111-1111-1111-000000000005', 'jewelry', 'Jewelry', 4);

-- Insert Community subcategories
INSERT INTO categories (id, parent_id, slug, label, sort_order) VALUES
  ('22222222-6666-1111-1111-000000000001', '11111111-1111-1111-1111-000000000006', 'cultural_events', 'Cultural Events', 1),
  ('22222222-6666-1111-1111-000000000002', '11111111-1111-1111-1111-000000000006', 'temple_events', 'Temple Events', 2),
  ('22222222-6666-1111-1111-000000000003', '11111111-1111-1111-1111-000000000006', 'volunteering', 'Volunteering', 3),
  ('22222222-6666-1111-1111-000000000004', '11111111-1111-1111-1111-000000000006', 'festivals', 'Festivals', 4);

-- Real Estate Category Fields (applies to all Real Estate subcategories)
INSERT INTO category_fields (category_id, slug, label, field_type, required, placeholder, sort_order, options) VALUES
  ('11111111-1111-1111-1111-000000000001', 'bedrooms', 'Number of Bedrooms', 'dropdown', false, 'Select bedrooms', 1, 
   '[{"label":"1 Bedroom","value":"1"},{"label":"2 Bedrooms","value":"2"},{"label":"3 Bedrooms","value":"3"},{"label":"4+ Bedrooms","value":"4+"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'bathrooms', 'Number of Bathrooms', 'dropdown', false, 'Select bathrooms', 2,
   '[{"label":"1 Bathroom","value":"1"},{"label":"2 Bathrooms","value":"2"},{"label":"3+ Bathrooms","value":"3+"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'availability_date', 'Available From', 'text', false, 'e.g. June 1, 2026', 3, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'lease_type', 'Lease Type', 'dropdown', false, 'Select lease type', 4,
   '[{"label":"Monthly","value":"monthly"},{"label":"Long Term (6+ months)","value":"long_term"},{"label":"Short Term","value":"short_term"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'utilities_included', 'Utilities Included', 'radio', false, '', 5,
   '[{"label":"Yes","value":"yes"},{"label":"No","value":"no"},{"label":"Partial","value":"partial"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'furnishing', 'Furnishing', 'radio', false, '', 6,
   '[{"label":"Furnished","value":"furnished"},{"label":"Unfurnished","value":"unfurnished"},{"label":"Semi-Furnished","value":"semi_furnished"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'parking', 'Parking Available', 'radio', false, '', 7,
   '[{"label":"Yes","value":"yes"},{"label":"No","value":"no"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000001', 'laundry', 'Laundry', 'radio', false, '', 8,
   '[{"label":"In-Unit","value":"in_unit"},{"label":"Shared","value":"shared"},{"label":"Not Available","value":"none"}]'::jsonb);

-- Vehicles Category Fields
INSERT INTO category_fields (category_id, slug, label, field_type, required, placeholder, sort_order, options) VALUES
  ('11111111-1111-1111-1111-000000000002', 'make', 'Make', 'text', true, 'e.g. Honda, Toyota', 1, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'model', 'Model', 'text', true, 'e.g. Civic, Corolla', 2, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'year', 'Year', 'number', true, 'e.g. 2020', 3, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'mileage', 'Mileage (km)', 'number', false, 'e.g. 50000', 4, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'fuel_type', 'Fuel Type', 'dropdown', false, 'Select fuel type', 5,
   '[{"label":"Gasoline","value":"gasoline"},{"label":"Diesel","value":"diesel"},{"label":"Electric","value":"electric"},{"label":"Hybrid","value":"hybrid"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'transmission', 'Transmission', 'radio', false, '', 6,
   '[{"label":"Automatic","value":"automatic"},{"label":"Manual","value":"manual"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'condition', 'Condition', 'radio', false, '', 7,
   '[{"label":"Excellent","value":"excellent"},{"label":"Good","value":"good"},{"label":"Fair","value":"fair"},{"label":"Needs Work","value":"needs_work"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'color', 'Color', 'text', false, 'e.g. Black, White', 8, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000002', 'vin', 'VIN Number', 'text', false, 'Vehicle Identification Number', 9, '[]'::jsonb);

-- Jobs Category Fields
INSERT INTO category_fields (category_id, slug, label, field_type, required, placeholder, sort_order, options) VALUES
  ('11111111-1111-1111-1111-000000000003', 'job_title', 'Job Title', 'text', true, 'e.g. Software Developer', 1, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000003', 'company_name', 'Company Name', 'text', false, 'Company or employer name', 2, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000003', 'job_type', 'Job Type', 'dropdown', true, 'Select job type', 3,
   '[{"label":"Full Time","value":"full_time"},{"label":"Part Time","value":"part_time"},{"label":"Contract","value":"contract"},{"label":"Temporary","value":"temporary"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000003', 'salary_range', 'Salary Range', 'text', false, 'e.g. $50,000 - $70,000/year', 4, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000003', 'experience_required', 'Experience Required', 'dropdown', false, 'Select experience level', 5,
   '[{"label":"Entry Level","value":"entry"},{"label":"1-2 years","value":"1_2_years"},{"label":"3-5 years","value":"3_5_years"},{"label":"5+ years","value":"5_plus"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000003', 'work_permit', 'Work Permit Required', 'radio', false, '', 6,
   '[{"label":"Yes","value":"yes"},{"label":"No","value":"no"},{"label":"Sponsorship Available","value":"sponsorship"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000003', 'remote_option', 'Remote Work Option', 'radio', false, '', 7,
   '[{"label":"Remote","value":"remote"},{"label":"Hybrid","value":"hybrid"},{"label":"On-Site","value":"onsite"}]'::jsonb);

-- Services Category Fields
INSERT INTO category_fields (category_id, slug, label, field_type, required, placeholder, sort_order, options) VALUES
  ('11111111-1111-1111-1111-000000000004', 'service_type', 'Service Type', 'text', true, 'Brief description of service', 1, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000004', 'hourly_rate', 'Rate', 'text', false, 'e.g. $50/hour or per session', 2, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000004', 'availability', 'Availability', 'text', false, 'When are you available?', 3, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000004', 'certifications', 'Certifications', 'text', false, 'Professional certifications', 4, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000004', 'languages_spoken', 'Languages Spoken', 'text', false, 'e.g. English, French, Hindi', 5, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000004', 'years_experience', 'Years of Experience', 'number', false, 'Years in business', 6, '[]'::jsonb);

-- Buy & Sell Category Fields
INSERT INTO category_fields (category_id, slug, label, field_type, required, placeholder, sort_order, options) VALUES
  ('11111111-1111-1111-1111-000000000005', 'condition', 'Condition', 'radio', true, '', 1,
   '[{"label":"Brand New","value":"new"},{"label":"Like New","value":"like_new"},{"label":"Good","value":"good"},{"label":"Fair","value":"fair"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000005', 'brand', 'Brand', 'text', false, 'Brand name if applicable', 2, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000005', 'age', 'Age of Item', 'text', false, 'e.g. 6 months, 2 years', 3, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000005', 'warranty', 'Warranty', 'radio', false, '', 4,
   '[{"label":"Under Warranty","value":"yes"},{"label":"Expired","value":"no"},{"label":"N/A","value":"na"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000005', 'delivery_available', 'Delivery Available', 'radio', false, '', 5,
   '[{"label":"Yes","value":"yes"},{"label":"No - Pickup Only","value":"no"}]'::jsonb);

-- Community Category Fields
INSERT INTO category_fields (category_id, slug, label, field_type, required, placeholder, sort_order, options) VALUES
  ('11111111-1111-1111-1111-000000000006', 'event_date', 'Event Date', 'text', true, 'e.g. March 25, 2026', 1, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000006', 'event_time', 'Event Time', 'text', false, 'e.g. 6:00 PM - 9:00 PM', 2, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000006', 'location_details', 'Venue/Location', 'text', true, 'Event location details', 3, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000006', 'organizer', 'Organizer', 'text', false, 'Organization or person name', 4, '[]'::jsonb),
  ('11111111-1111-1111-1111-000000000006', 'registration_required', 'Registration Required', 'radio', false, '', 5,
   '[{"label":"Yes","value":"yes"},{"label":"No","value":"no"}]'::jsonb),
  ('11111111-1111-1111-1111-000000000006', 'cost', 'Cost', 'text', false, 'e.g. Free, $20 per person', 6, '[]'::jsonb);
