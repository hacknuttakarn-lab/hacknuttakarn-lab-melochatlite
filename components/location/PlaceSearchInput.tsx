"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatMeloDistance,
  resolveMeloPlace,
  searchMeloPlaces,
  type MeloPlaceAutocompleteSuggestion,
  type MeloPlaceResult,
} from "./meloLocationWeb";
import styles from "./PlaceSearchInput.module.css";

export type PlaceSearchResult = MeloPlaceResult;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSearchResult) => void;
  placeholder: string;
  locale: string;
  searchingLabel: string;
  noResultsLabel: string;
  ariaLabel?: string;
  regionCode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export default function PlaceSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
  locale,
  searchingLabel,
  noResultsLabel,
  ariaLabel,
  regionCode = "",
  latitude = null,
  longitude = null,
}: Props) {
  const [results, setResults] = useState<MeloPlaceAutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [open, setOpen] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    const query = value.trim();
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setOpen(false);
      return;
    }
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const next = await searchMeloPlaces({
          query,
          languageCode: locale,
          regionCode,
          latitude,
          longitude,
        });
        if (active) setResults(next);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [latitude, locale, longitude, regionCode, value]);

  async function choose(suggestion: MeloPlaceAutocompleteSuggestion) {
    if (resolving) return;
    setResolving(true);
    try {
      const place = await resolveMeloPlace({
        placeId: suggestion.placeId,
        languageCode: locale,
        regionCode,
      });
      skipNextSearch.current = true;
      onSelect(place);
      setResults([]);
      setOpen(false);
    } catch {
      setOpen(true);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className={styles.root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <div className={styles.inputShell}>
        <span aria-hidden="true">⌕</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          autoComplete="off"
        />
        {(loading || resolving) ? <i className={styles.inlineSpinner} aria-hidden="true" /> : null}
      </div>

      {open ? (
        <div className={styles.results} role="listbox">
          {loading && !results.length ? <div className={styles.state}><i />{searchingLabel}</div> : null}
          {!loading && !resolving && results.length === 0 ? <div className={styles.state}>{noResultsLabel}</div> : null}
          {!loading ? results.map((place) => (
            <button key={place.id} type="button" className={styles.result} disabled={resolving} onClick={() => void choose(place)}>
              <span className={styles.pin} aria-hidden="true">⌖</span>
              <span className={styles.resultCopy}>
                <strong>{place.mainText}</strong>
                {place.secondaryText ? <small>{place.secondaryText}</small> : null}
                {place.distanceMeters != null ? <em>{formatMeloDistance(place.distanceMeters, locale)}</em> : null}
              </span>
            </button>
          )) : null}
        </div>
      ) : null}
    </div>
  );
}
