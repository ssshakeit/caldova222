import { describe, it, expect } from 'vitest';
import {
    filterByDepartment,
    filterByLocation,
    formatPostedDate,
    sortByNewest,
} from './jobs';
import type { Job } from '../types/job';

/** Build a minimal job fixture with overridable department and location values. */
function makeJob(
    slug: string,
    postedDate: string,
    department = 'Technology',
    location = 'Remote',
): Job {
    return {
        slug,
        title: `Role ${slug}`,
        department,
        location,
        type: 'Full-time',
        remote: true,
        postedDate,
        summary: 'A role.',
    };
}

describe('sortByNewest', () => {
    it('orders jobs by posted date, newest first', () => {
        const jobs = [
            makeJob('a', '2027-01-01'),
            makeJob('b', '2027-03-15'),
            makeJob('c', '2027-02-10'),
        ];
        expect(sortByNewest(jobs).map((j) => j.slug)).toEqual(['b', 'c', 'a']);
    });

    it('does not mutate the input array', () => {
        const jobs = [makeJob('a', '2027-01-01'), makeJob('b', '2027-03-15')];
        const original = jobs.map((j) => j.slug);
        sortByNewest(jobs);
        expect(jobs.map((j) => j.slug)).toEqual(original);
    });
});

describe('filterByDepartment', () => {
    const jobs = [
        makeJob('engineer', '2027-01-01', 'Technology', 'Remote'),
        makeJob('scientist', '2027-01-02', 'Research', 'Boston, MA'),
        makeJob('analyst', '2027-01-03', 'Technology', 'Seattle, WA'),
    ];

    it('returns jobs in the selected department', () => {
        expect(filterByDepartment(jobs, 'Technology').map((job) => job.slug)).toEqual([
            'engineer',
            'analyst',
        ]);
    });

    it('returns every job when no department is selected', () => {
        expect(filterByDepartment(jobs, '')).toEqual(jobs);
    });

    it('returns no jobs for an unmatched department', () => {
        expect(filterByDepartment(jobs, 'Legal')).toEqual([]);
    });
});

describe('filterByLocation', () => {
    const jobs = [
        makeJob('engineer', '2027-01-01', 'Technology', 'Remote'),
        makeJob('scientist', '2027-01-02', 'Research', 'Boston, MA'),
        makeJob('analyst', '2027-01-03', 'Technology', 'Remote'),
    ];

    it('returns jobs in the selected location', () => {
        expect(filterByLocation(jobs, 'Remote').map((job) => job.slug)).toEqual([
            'engineer',
            'analyst',
        ]);
    });

    it('returns every job when no location is selected', () => {
        expect(filterByLocation(jobs, '')).toEqual(jobs);
    });

    it('returns no jobs for an unmatched location', () => {
        expect(filterByLocation(jobs, 'New York, NY')).toEqual([]);
    });
});

describe('combined job filters', () => {
    const jobs = [
        makeJob('remote-engineer', '2027-01-01', 'Technology', 'Remote'),
        makeJob('seattle-engineer', '2027-01-02', 'Technology', 'Seattle, WA'),
        makeJob('boston-scientist', '2027-01-03', 'Research', 'Boston, MA'),
    ];

    it('combines department and location selections with AND', () => {
        const matches = filterByLocation(
            filterByDepartment(jobs, 'Technology'),
            'Seattle, WA',
        );
        expect(matches.map((job) => job.slug)).toEqual(['seattle-engineer']);
    });

    it('returns no jobs when the selected filters do not overlap', () => {
        const matches = filterByLocation(
            filterByDepartment(jobs, 'Technology'),
            'Boston, MA',
        );
        expect(matches).toEqual([]);
    });

    it('reset selections restore all jobs', () => {
        const matches = filterByLocation(
            filterByDepartment(jobs, ''),
            '',
        );
        expect(matches).toEqual(jobs);
    });
});

describe('formatPostedDate', () => {
    it('formats an ISO date as a readable string', () => {
        expect(formatPostedDate('2027-01-05')).toBe('January 5, 2027');
    });

    it('returns the raw value when the date is unparseable', () => {
        expect(formatPostedDate('not-a-date')).toBe('not-a-date');
    });
});
