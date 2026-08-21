import { ProfileScreen } from '../../src/components/ProfileScreen'
import { ScreenContainer } from '../../src/components/ScreenContainer'

export default function OwnerProfileScreen() {
  return (
    <ScreenContainer style={{ flex: 1 }}>
      <ProfileScreen isOwner />
    </ScreenContainer>
  )
}
