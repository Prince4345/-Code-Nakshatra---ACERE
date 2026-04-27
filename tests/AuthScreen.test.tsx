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
        onForgotPassword={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Create your workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'verifier' } });
    expect(setAuthRole).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Back to login'));
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
        onForgotPassword={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  });

  it('renders password recovery without password or role fields', () => {
    const onSubmit = vi.fn(async (event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onToggleRoute = vi.fn();

    render(
      <AuthScreen
        route="/forgot-password"
        authRole="exporter"
        setAuthRole={vi.fn()}
        authError=""
        authNotice="Reset link sent."
        busy={false}
        onSubmit={onSubmit}
        onToggleRoute={onToggleRoute}
        onForgotPassword={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
    expect(screen.getByText('Reset link sent.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back to login'));
    expect(onToggleRoute).toHaveBeenCalledTimes(1);
  });
});
