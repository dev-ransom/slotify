process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_fake_key_for_tests";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://fake:fake@localhost:5432/fake";
