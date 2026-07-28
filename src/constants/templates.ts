export interface TripTemplate {
  key: string;
  icon: string;
  titleKey: string;
  descKey: string;
  allocations: Record<string, number>; // percentage weights
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    key: 'city',
    icon: '🏙️',
    titleKey: 'w_template_city',
    descKey: 'w_template_city_desc',
    allocations: {
      hotel: 35,
      flights: 25,
      food: 20,
      activities: 10,
      shopping: 5,
      transport: 5,
    },
  },
  {
    key: 'beach',
    icon: '🏖️',
    titleKey: 'w_template_beach',
    descKey: 'w_template_beach_desc',
    allocations: {
      hotel: 40,
      flights: 25,
      food: 20,
      activities: 10,
      misc: 5,
    },
  },
  {
    key: 'roadtrip',
    icon: '🚗',
    titleKey: 'w_template_roadtrip',
    descKey: 'w_template_roadtrip_desc',
    allocations: {
      transport: 35,
      hotel: 30,
      food: 20,
      activities: 10,
      insurance: 5,
    },
  },
  {
    key: 'family',
    icon: '👨‍👩‍👧‍👦',
    titleKey: 'w_template_family',
    descKey: 'w_template_family_desc',
    allocations: {
      hotel: 35,
      food: 25,
      flights: 20,
      activities: 15,
      misc: 5,
    },
  },
  {
    key: 'ski',
    icon: '⛷️',
    titleKey: 'w_template_ski',
    descKey: 'w_template_ski_desc',
    allocations: {
      hotel: 35,
      activities: 30,
      food: 20,
      transport: 15,
    },
  },
  {
    key: 'backpack',
    icon: '🎒',
    titleKey: 'w_template_backpack',
    descKey: 'w_template_backpack_desc',
    allocations: {
      food: 30,
      hotel: 25,
      transport: 20,
      activities: 10,
      visa: 10,
      insurance: 5,
    },
  },
];
