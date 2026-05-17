import { FormProvider, useForm } from "react-hook-form";
import { Input } from "~/atoms/Input";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch: (value: string) => void;
  className?: string;
}

interface SearchFormData {
  search: string;
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export function SearchBar({
  placeholder = "Search",
  defaultValue = "",
  onSearch,
  className,
}: SearchBarProps) {
  const methods = useForm<SearchFormData>({
    defaultValues: {
      search: defaultValue,
    },
  });

  const onSubmit = (data: SearchFormData) => {
    onSearch(data.search);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
        <Input
          name="search"
          type="text"
          placeholder={placeholder}
          startAdornment={<SearchIcon />}
          hideLabel
        />
      </form>
    </FormProvider>
  );
}
