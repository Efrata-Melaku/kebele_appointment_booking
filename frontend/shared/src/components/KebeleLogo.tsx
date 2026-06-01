import logoUrl from '../assets/kebele-logo.png';
import { cn } from './ui/utils';

const sizeClasses = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
} as const;

type Props = {
  size?: keyof typeof sizeClasses;
  showText?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  imageClassName?: string;
};

export function KebeleLogo({
  size = 'md',
  showText = true,
  title = 'KEBELE',
  subtitle,
  className,
  imageClassName,
}: Props) {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <img
        src={logoUrl}
        alt="Kebele"
        className={cn('object-contain shrink-0 rounded-full', sizeClasses[size], imageClassName)}
      />
      {showText ? (
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 leading-tight truncate">{title}</p>
          {subtitle ? (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { logoUrl as kebeleLogoUrl };
