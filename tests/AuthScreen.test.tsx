import type { FormEvent } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthScreen from '../components/AuthScreen';

afterEach(() => cleanup());

describe('AuthScreen', () => {
  it('renders the signup flow with role selection and secure password input', () => {
    const setAuthRole = vi.fn();
    const onSubmit = vi.fn(async (event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onToggleRoute = vi.fn();

    render(
      <AuthScreen
        route="/signup"
        authRole="exporter"
        setAuthRole={setAuthRole}
        authError=""
        busy={false}
        onSubmit={onSubmit}
        onToggleRoute={onToggleRoute}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Create your workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'verifier' } });
    expect(setAuthRole).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Already have an account?'));
    expect(onToggleRoute).toHaveBeenCalledTimes(1);
  });

  it('shows backend-safe login copy and errors', () => {
    render(
      <AuthScreen
        route="/login"
        authRole="importer"
        setAuthRole={vi.fn()}
        authError="Invalid credentials"
        busy={true}
        onSubmit={vi.fn(async (event: FormEvent<HTMLFormElement>) => event.preventDefault())}
        onToggleRoute={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  });
});
