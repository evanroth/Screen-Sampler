import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <Label className="text-xs text-muted-foreground min-w-[60px]">{label}</Label>}
      <div className="relative flex items-center gap-2 flex-1">
        <div
          className="w-8 h-8 rounded-md border border-border overflow-hidden cursor-pointer flex-shrink-0"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <Input
          value={value.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          className="h-8 font-mono text-xs bg-secondary border-border"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
