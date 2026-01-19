import { Match } from './match.model';

/**
 * Bar facilities model
 * Represents amenities available at a bar
 */
export interface BarFacilities {
  screens: number;
  hasFood: boolean;
  hasOutdoorSeating: boolean;
  hasWifi: boolean;
  capacity?: number;
}

/**
 * Bar opening hours model
 * Represents weekly opening hours
 */
export interface BarOpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

/**
 * Position model
 * Represents geographic coordinates
 */
export interface Position {
  lat: number;
  lng: number;
}

/**
 * Bar model
 * Represents a sports bar/venue
 */
export interface Bar {
  id: string;
  name: string;
  position: Position;
  address?: string;
  description?: string;
  rating?: number;
  imageUrl?: string;
  matches?: Match[];
  facilities?: BarFacilities;
  openingHours?: BarOpeningHours;
  phone?: string;
}

