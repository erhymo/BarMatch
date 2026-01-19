import { Match } from './match';

export interface BarFacilities {
  screens: number;
  hasFood: boolean;
  hasOutdoorSeating: boolean;
  hasWifi: boolean;
  capacity?: number;
}

export interface BarOpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface Bar {
  id: string;
  name: string;
  position: {
    lat: number;
    lng: number;
  };
  address?: string;
  description?: string;
  rating?: number;
  imageUrl?: string;
  matches?: Match[];
  facilities?: BarFacilities;
  openingHours?: BarOpeningHours;
  phone?: string;
}

