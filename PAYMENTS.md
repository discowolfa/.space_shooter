# Платежи

Только MockPaymentProvider и MockSubscriptionProvider в src/services.ts; checkout mock запрещён в production и не подключён к UI, статус mock-подписки всегда неактивный. Реальных PaymentService, DonationService, EntitlementService, управления подписками и восстановления покупок пока нет. Не принимать настоящие деньги до реализации backend, Stripe/PayPal webhooks с проверкой подписи, истории событий, возвратов и защиты от повторной обработки. IndexedDB не источник платных прав. Внешних запросов к платёжным системам нет.
