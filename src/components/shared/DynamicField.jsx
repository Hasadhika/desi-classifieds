import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function DynamicField({ field, value, onChange }) {
  const { slug, label, field_type, required, placeholder, options, help_text } = field;

  const renderField = () => {
    switch (field_type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(slug, e.target.value)}
            placeholder={placeholder || ''}
            className="mt-1.5"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(slug, e.target.value)}
            placeholder={placeholder || ''}
            className="mt-1.5"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(slug, e.target.value)}
            placeholder={placeholder || ''}
            className="mt-1.5 min-h-[80px]"
          />
        );

      case 'dropdown': {
        const dropdownOptions = (options || []).map(opt =>
          typeof opt === 'string' ? { value: opt, label: opt } : opt
        );
        return (
          <Select value={value || ''} onValueChange={(val) => onChange(slug, val)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {dropdownOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case 'radio': {
        // Normalise options: handle both plain strings ["Male","Female"]
        // and objects [{value:"male", label:"Male"}]
        const radioOptions = (options || []).map(opt =>
          typeof opt === 'string' ? { value: opt, label: opt } : opt
        );
        return (
          <RadioGroup value={value || ''} onValueChange={(val) => onChange(slug, val)} className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {radioOptions.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`${slug}-${opt.value}`} />
                <Label htmlFor={`${slug}-${opt.value}`} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      }

      case 'checkbox': {
        const checkboxOptions = (options || []).map(opt =>
          typeof opt === 'string' ? { value: opt, label: opt } : opt
        );
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="mt-2 space-y-2">
            {checkboxOptions.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${slug}-${opt.value}`}
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter(v => v !== opt.value);
                    onChange(slug, newValues);
                  }}
                />
                <Label htmlFor={`${slug}-${opt.value}`} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        );
      }

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(slug, e.target.value)}
            placeholder={placeholder || ''}
            className="mt-1.5"
          />
        );
    }
  };

  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {help_text && <p className="text-xs text-gray-500 mt-1">{help_text}</p>}
    </div>
  );
}
