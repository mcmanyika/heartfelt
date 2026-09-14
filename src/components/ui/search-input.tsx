import { fieldClassName } from "@/components/ui/form-field";

type SearchInputProps = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
};

export function SearchInput({
  name = "q",
  defaultValue,
  placeholder = "Search",
}: SearchInputProps) {
  return (
    <input
      type="search"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={fieldClassName}
      aria-label={placeholder}
    />
  );
}
