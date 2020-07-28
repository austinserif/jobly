DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS companies;

CREATE TABLE companies(
    handle text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    num_employees integer,
    description text,
    logo_url text
);

CREATE TABLE jobs(
    id SERIAL PRIMARY KEY,
    title text NOT NULL,
    salary float NOT NULL,
    equity float NOT NULL CHECK (equity <= 1 AND equity >= 0),
    company_handle text,
    date_posted timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobs
        FOREIGN KEY(company_handle)
            REFERENCES companies(handle)
                ON DELETE CASCADE
);