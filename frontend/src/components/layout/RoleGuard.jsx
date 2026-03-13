import { useAuth } from '../../contexts/AuthContext';

export const RoleGuard = ({ allowedRoles, children }) => {
    const { user } = useAuth();

    // If no roles specified, or user has the role, show the element
    if (!allowedRoles || (user && allowedRoles.includes(user.role))) {
        return <>{children}</>;
    }

    // Otherwise, render nothing
    return null;
};
