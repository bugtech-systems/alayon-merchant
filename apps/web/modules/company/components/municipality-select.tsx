import { Select } from "@medusajs/ui";

interface MunicipalitySelectProps {
  value: string;
  onChange: (value: string) => void;
}

const MUNICIPALITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  // Add your municipalities
];

export function MunicipalitySelect({ value, onChange }: MunicipalitySelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <Select.Trigger className="w-full">
        <Select.Value placeholder="Select municipality" />
      </Select.Trigger>
      <Select.Content>
        {MUNICIPALITIES.map((city) => (
          <Select.Item key={city} value={city}>
            {city}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}