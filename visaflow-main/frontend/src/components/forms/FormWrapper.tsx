import type { FormHTMLAttributes, ReactNode } from 'react';
import { cn } from '~/utils/cn';

interface FormWrapperProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

export function FormWrapper({ className, children, ...props }: FormWrapperProps) {
  return (
    <form className={cn('space-y-6', className)} {...props}>
      {children}
    </form>
  );
}
