import React from 'react';
import {
  BatteryCharging,
  Building2,
  Car,
  CreditCard,
  Droplets,
  Flame,
  GraduationCap,
  Landmark,
  Phone,
  Shield,
  Smartphone,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react';

export const CategoryIcon: React.FC<{ iconKey: string; className?: string }> = ({
  iconKey,
  className = 'w-5 h-5',
}) => {
  switch (iconKey) {
    case 'zap':
      return <Zap className={className} />;
    case 'droplets':
      return <Droplets className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'smartphone':
    case 'sim':
      return <Smartphone className={className} />;
    case 'tv':
      return <Tv className={className} />;
    case 'wifi':
      return <Wifi className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'credit-card':
      return <CreditCard className={className} />;
    case 'landmark':
      return <Landmark className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'building':
      return <Building2 className={className} />;
    case 'graduation-cap':
      return <GraduationCap className={className} />;
    case 'battery-charging':
      return <BatteryCharging className={className} />;
    default:
      return <Zap className={className} />;
  }
};
