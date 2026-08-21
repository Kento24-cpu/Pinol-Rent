import { NotificationsList } from '../../src/components/NotificationsList'
import { ScreenContainer } from '../../src/components/ScreenContainer'

export default function OwnerNotificationsList() {
  return (
    <ScreenContainer style={{ flex: 1 }}>
      <NotificationsList />
    </ScreenContainer>
  )
}
